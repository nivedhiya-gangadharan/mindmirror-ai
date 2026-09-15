from rest_framework import serializers
from .models import Availability, Doctor


class AvailabilitySerializer(serializers.ModelSerializer):
    doctor = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Availability
        fields = [
            "id",
            "doctor",
            "from_date",
            "to_date",
            "start_time",
            "end_time",
        ]
        read_only_fields = ["id", "doctor"]

    def validate(self, attrs):
        from_date = attrs.get("from_date") or (self.instance.from_date if self.instance else None)
        to_date = attrs.get("to_date") or (self.instance.to_date if self.instance else None)
        start_time = attrs.get("start_time") or (self.instance.start_time if self.instance else None)
        end_time = attrs.get("end_time") or (self.instance.end_time if self.instance else None)

        if from_date and to_date and from_date > to_date:
            raise serializers.ValidationError({"to_date": "'To' date cannot be earlier than 'From' date."})

        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({"start_time": "Start time must be before end time."})

        return attrs
